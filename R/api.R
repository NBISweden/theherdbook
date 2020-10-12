library(optiSel)
library(nprcgenekeepr)
library(DBI)
library(jsonlite)

# Returns a connection instance to a PG server
connect_to_pg <- function() {
  pg_host   <- Sys.getenv("POSTGRES_HOST", "localhost")
  pg_dbname <- Sys.getenv("POSTGRES_DBNAME", "herdbook")
  pg_port   <- Sys.getenv("POSTGRES_PORT", "5432")
  pg_user   <- Sys.getenv("POSTGRES_USER", "herdbook")
  pg_passw  <- Sys.getenv("POSTGRES_PASSWORD", "insecure")
  
  con <- dbConnect(RPostgres::Postgres(),dbname = get("pg_dbname"),
                   host = get("pg_host"),
                   port = get("pg_port"),
                   user = get("pg_user"),
                   password = get("pg_passw"))
  return (con)
}

# Terminates a connection to a PG server
disconnect_from_pg <- function(con) {
  dbDisconnect(con)
}

# Returns a data structure with selected individuals' ancestry information for genebank_id 
# 1 Gotlandskanin 2, Mellerud

get_all_individuals <- function(con, genebank_id) {
  res <- dbSendQuery(con, paste0("SELECT      i.number as Indiv, f.number as Sire, m.number as Dam, i.sex as Sex, i.birth_date as Born, i.death_date,i.death_note, 
            (i.death_date IS NULL
             AND (i.death_note = '' OR i.death_note IS NULL)
             AND ih.herd_tracking_date > current_date - interval '1 year') AS is_active
FROM        individual i
LEFT JOIN   individual f ON (i.father_id = f.individual_id)
LEFT JOIN   individual m ON (i.mother_id = m.individual_id)
JOIN        (
                SELECT DISTINCT ON (individual_id)
                         individual_id,
                         herd_id,
                         herd_tracking_date
                FROM     herd_tracking
                ORDER BY individual_id, herd_tracking_date DESC
            ) AS ih ON (ih.individual_id = i.individual_id)
JOIN        herd h ON (ih.herd_id = h.herd_id)
WHERE       h.genebank_id =",genebank_id))
  individuals <- dbFetch(res)
  dbClearResult(res)
  disconnect_from_pg(con)
  return (individuals)
  
}

get_rabbits<-function(genebank_id){
  con <- connect_to_pg()
  rabbits <- get_all_individuals(con,genebank_id)
  names(rabbits)<-c("Indiv","Sire","Dam","Sex", "Born", "death_date","death_note","is_active")
  rabbits$Born_date<-rabbits$Born
  rabbits$Born<-format(rabbits$Born_date, format="%Y")
  Pedi <- prePed(rabbits)
  
  return(Pedi)
}

calculate_inbreeding <- function(genebank_id) {
    Pedi<-get_rabbits(genebank_id)
    return (pedInbreeding(Pedi))
}

#* @serializer json
#* @get /kinship/<genebank_id:int>
calculate_kinship <- function(genebank_id) {
    if(genebank_id<1 | genebank_id>2){stop("must be 1 or 2")}
    Pedi<-get_rabbits(genebank_id)
    keep<-Pedi[Pedi$is_active == "TRUE",]$Indiv
    return (as.data.frame(pedIBD(Pedi,keep.only=keep)))
}

calculateFEFG <- function() {
  Pedi<-get_rabbits(genebank_id)
  ped<- data.frame(
         id = Pedi$Indiv,
        sire = Pedi$Sire,
        dam = Pedi$Dam,
        stringsAsFactors = TRUE)
  ped["gen"] <- findGeneration(ped$id, ped$sire, ped$dam)
  ped$population <- getGVPopulation(ped, keep)
  fe <- calcFE(ped)
  allelesFactors <- geneDrop(ped$id, ped$sire, ped$dam, ped$gen,, genotype = NULL, n = 5000, updateProgress = NULL)
} 


#* @serializer json
#* @get /inbreeding/<genebank_id:int>
inbreeding <- function(genebank_id) {
  if(genebank_id<1 | genebank_id>2){stop("must be 1 or 2")}
  pin <- calculate_inbreeding(genebank_id)
  return(pin)
}


#* @serializer json
#* @get /meankinship/<genebank_id:int>
meankinship <- function(genebank_id) {
  if(genebank_id<1 | genebank_id>2){stop("must be 1 or 2")}
  pkin <- calculate_kinship(genebank_id)
  return(as.data.frame(rowMeans(pkin)))
  
}

