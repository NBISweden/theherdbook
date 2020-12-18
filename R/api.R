library(optiSel)
library(nprcgenekeepr)
library(digest)
library(rjson)

#Only load the environment one
api_base   <- Sys.getenv("APIBASE", "http://herdbook-main:8443/api/")


get_resource <- function(resource) {
  res <-fromJSON(paste(readLines(cat(api_base,resource, sep="")), collapse=""))
  return (res)
}

#Get available genebank ids in the database
get_all_genebanks <- function() {
  genebanks <- get_resource("genebanks")
  return (genebanks)
}

#Return the digest of the current individuals in the corresponding genebank 
get_modifications_digest <- function(genebank_id){
  #' Get digest of the current individuals in a given genebank
  #'
  #' @description This function calculate the digest of all the individual numbers of the given genebank.
  #'
  #' @param genebank_id The Genebank ID to get the individual number list from.
  #' @details If the digest changes we know we need to recalculate

  individuals <- get_resource(cat("genebanks/",genebank_id,"/individuals", sep=""))
  return (digest(individuals))
}
?get_modifications_digest

# Returns a data structure with selected individuals' ancestry information for genebank_id 
# 1 Gotlandskanin 2, Mellerud
#Format as pedigre using optiSel library

get_rabbits<-function(genebank_id){
  rabbits <- get_all_individuals(genebank_id)
  names(rabbits)<-c("Indiv","Sire","Dam","Sex", "Born", "is_active")
  rabbits$Born_date<-rabbits$Born
  rabbits$Born<-format(rabbits$Born_date, format="%Y")
  Pedi <- optiSel::prePed(rabbits)
  return(Pedi)
}


#Human readable version of all animals from the given genebank_id
get_all_individuals <- function(genebank_id) {
  individuals <- get_resource(cat("genebanks/",genebank_id,"/individuals", sep=""))
  return (individuals)
}


# Function to Preload data on startup
update_preload_all_data <- function() {
  genebanks<<-get_all_genebanks()
  for(i in genebanks$genebank_id){
    assign(paste0("MOD_",i),get_modifications_digest(i),envir = .GlobalEnv)
    update_data(i)
  }
}


#Update and calculate the Kinship matrix and inbreeding
update_data <- function(genebank_id) {
  Pedi<-get_rabbits(genebank_id)
  #Calculate Inbreeding and name it after genebank_id
  assign(paste0("IDB_",genebank_id),data.frame(number=Pedi[,1], Inbr=pedigree::calcInbreeding(Pedi[,1:3]), stringsAsFactors = FALSE),envir = .GlobalEnv)
  #Get current active population
  keep<-Pedi[Pedi$is_active == "TRUE",]$Indiv
  #Calculate Kinship of current population and return Kinship matrix and Meankinship
  assign(paste0("KIN_",genebank_id),optiSel::pedIBD(Pedi,keep.only=keep),envir = .GlobalEnv)
  assign(paste0("MK_",genebank_id),colMeans(get(paste0("KIN_",genebank_id))),envir = .GlobalEnv)
}

#* @serializer csv
#* @get /kinship/<genebank_id:int>
calculate_kinship <- function(genebank_id, update_from_db="FALSE") {
  if(!(genebank_id %in% genebanks$genebank_id)){stop("must be a valid genebank_id")}
  if(update_from_db){
    MOD_change<-get_modifications_digest(genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(genebank_id)
    }
   }
  return(as.data.frame(get(paste0("KIN_",genebank_id))))
}

#For Future use
# Calculates founder Equivalents
# @return The founder equivalents \code{FE = 1 / sum(p ^ 2)}, where \code{p}
# is average number of descendants and \code{r} is the mean number of founder
# alleles retained in the gene dropping experiment.
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


#Updated and reload the data structures from the sql server
#* @get /update-db/
update_data_cron <- function() {
  for(i in genebanks$genebank_id){
    MOD_change<-get_modifications_digest(i)
    if(get(paste0("MOD_",i))!= MOD_change)
    {
      assign(paste0("MOD_",i),MOD_change,envir = .GlobalEnv)
      update_data(i)
      print(paste0("Updated genebank id: ",i))
    }
  }
}

#* @serializer csv
#* @get /inbreeding/<genebank_id:int>
inbreeding <- function(genebank_id,update_from_db="FALSE") {
  if(!(genebank_id %in% genebanks$genebank_id)){stop("must be a valid genebank_id")}
  if(update_from_db ){
    MOD_change<-get_modifications_digest(genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(genebank_id)
    }
  }
  return (get(paste0("IDB_",genebank_id)))
}


#* @serializer csv
#* @get /meankinship/<genebank_id:int>
meankinship <- function(genebank_id,update_from_db="FALSE") {
  if(!(genebank_id %in% genebanks$genebank_id)){stop("must be a valid genebank_id")}
  if(update_from_db ){
    MOD_change<-get_modifications_digest(genebank_id)
    if(get(paste0("MOD_",genebank_id))!= MOD_change)
    {
      assign(paste0("MOD_",genebank_id),MOD_change,envir = .GlobalEnv)
      update_data(genebank_id)
    }
  }
  return(
    data.frame(number=names(get(paste0("MK_",genebank_id))), MK=get(paste0("MK_",genebank_id)), row.names=NULL)
  )

}


#RUN stuff and preload
update_preload_all_data()

